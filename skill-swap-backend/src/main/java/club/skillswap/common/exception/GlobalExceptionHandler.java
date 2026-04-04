package club.skillswap.common.exception;

import jakarta.servlet.http.HttpServletRequest;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.server.ResponseStatusException;

import club.skillswap.common.dto.ErrorResponseDto;

import java.time.Instant;
import java.util.Locale;

// @RestControllerAdvice 娉ㄨВ琛ㄦ槑杩欐槸涓€涓叏灞€鐨勫紓甯稿鐞嗙粍浠?
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * 澶勭悊鎴戜滑鑷畾涔夌殑 ResourceNotFoundException
     * 褰?Service 灞傛姏鍑鸿繖涓紓甯告椂锛岃繖涓柟娉曚細琚皟鐢ㄣ€?
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponseDto> handleResourceNotFoundException(ResourceNotFoundException ex, HttpServletRequest request) {
        ErrorResponseDto errorResponse = new ErrorResponseDto(
                Instant.now(),
                HttpStatus.NOT_FOUND.value(),
                "Not Found",
                ex.getMessage(),
                request.getRequestURI()
        );
        return new ResponseEntity<>(errorResponse, HttpStatus.NOT_FOUND);
    }

    /**
     * 澶勭悊 Spring Security 鐨?AccessDeniedException
     * 褰撶敤鎴峰皾璇曡闂粬浠病鏈夋潈闄愮殑璧勬簮鏃讹紙渚嬪锛屾櫘閫氱敤鎴疯闂鐞嗗憳绔偣锛夛紝杩欎釜鏂规硶浼氳璋冪敤銆?
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponseDto> handleAccessDeniedException(AccessDeniedException ex, HttpServletRequest request) {
        ErrorResponseDto errorResponse = new ErrorResponseDto(
                Instant.now(),
                HttpStatus.FORBIDDEN.value(),
                "Forbidden",
                "You do not have permission to access this resource.",
                request.getRequestURI()
        );
        return new ResponseEntity<>(errorResponse, HttpStatus.FORBIDDEN);
    }

    /**
     * 澶勭悊鎴戜滑鐨勯€氱敤涓氬姟閫昏緫寮傚父 (DomainException)銆?
     * 褰?Service 灞傛姏鍑鸿繖涓紓甯告椂锛岃繖涓柟娉曚細琚皟鐢紝骞惰繑鍥?400 Bad Request銆?
     */
    @ExceptionHandler(DomainException.class)
    public ResponseEntity<ErrorResponseDto> handleDomainException(DomainException ex, HttpServletRequest request) {
        ErrorResponseDto errorResponse = new ErrorResponseDto(
                Instant.now(),
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                ex.getMessage(), // 鐩存帴浣跨敤寮傚父涓畾涔夌殑娑堟伅
                request.getRequestURI()
        );
        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }

    /**
     * 鏂板锛氬鐞嗙敱 @Valid 娉ㄨВ瑙﹀彂鐨勯獙璇佸け璐ュ紓甯搞€?
     * 杩欎細鎹曡幏鎵€鏈?DTO 涓婄殑楠岃瘉閿欒锛堝 @NotBlank, @Size 绛夛級銆?
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponseDto> handleValidationExceptions(MethodArgumentNotValidException ex, HttpServletRequest request) {
        
        // 浠庡紓甯镐腑鎻愬彇绗竴涓敊璇俊鎭綔涓烘垜浠殑 message
        String errorMessage = ex.getBindingResult().getAllErrors().get(0).getDefaultMessage();

        log.debug("Validation failed: {}", errorMessage);

        ErrorResponseDto errorResponse = new ErrorResponseDto(
                Instant.now(),
                HttpStatus.BAD_REQUEST.value(),
                "Validation Failed",
                errorMessage, // 浣跨敤鍏蜂綋鐨勯獙璇侀敊璇俊鎭?
                request.getRequestURI()
        );
        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler({MaxUploadSizeExceededException.class, MultipartException.class})
    public ResponseEntity<ErrorResponseDto> handleMultipartUploadException(Exception ex, HttpServletRequest request) {
        String message = ex.getMessage() == null ? "" : ex.getMessage();
        String normalized = message.toLowerCase(Locale.ROOT);

        boolean isTooLarge = ex instanceof MaxUploadSizeExceededException
                || normalized.contains("maximum upload size")
                || normalized.contains("size exceeds")
                || normalized.contains("payload too large");

        if (isTooLarge) {
            ErrorResponseDto body = new ErrorResponseDto(
                    Instant.now(),
                    HttpStatus.PAYLOAD_TOO_LARGE.value(),
                    "Payload Too Large",
                    "Image is too large. Maximum allowed size is 10MB.",
                    request.getRequestURI()
            );
            return new ResponseEntity<>(body, HttpStatus.PAYLOAD_TOO_LARGE);
        }

        ErrorResponseDto body = new ErrorResponseDto(
                Instant.now(),
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                "Invalid upload request.",
                request.getRequestURI()
        );
        return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
    }

    /**
     * 澶勭悊 Spring 鐨?ResponseStatusException銆?
     * 杩欎釜寮傚父閫氬父鍦ㄦ垜浠渶瑕佸姩鎬佽缃?HTTP 鐘舵€佺爜鏃朵娇鐢紝渚嬪 401 Unauthorized 鎴?403 Forbidden銆?
     */
    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    public ResponseEntity<ErrorResponseDto> handleRSE(ResponseStatusException ex,
                                                    HttpServletRequest req) {
        HttpStatusCode status = ex.getStatusCode();

        // 鍏煎鑾峰彇鈥滈敊璇悕鈥濓紙FORBIDDEN/UNAUTHORIZED...锛?
        String error =
            (status instanceof HttpStatus hs) ? hs.getReasonPhrase() : status.toString();

        ErrorResponseDto body = new ErrorResponseDto(
            Instant.now(),
            status.value(),  // 鏁板瓧鐮?
            error,           // 閿欒鍚?
            ex.getReason(),  // 浣犳姏寮傚父鏃跺啓鐨?reason
            req.getRequestURI()
        );

        return ResponseEntity.status(status).body(body);
    }

    /**
     * 澶勭悊鏁版嵁搴撳畬鏁存€ц繚瑙勫紓甯?(DataIntegrityViolationException)銆?
     * 渚嬪锛屽綋灏濊瘯鍒犻櫎涓€涓湁澶栭敭渚濊禆鐨勮褰曟椂锛岃繖涓紓甯镐細琚姏鍑恒€?
     * 鎴戜滑灏嗗叾鏄犲皠涓?409 Conflict 鐘舵€佺爜銆?
     */
    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponseDto> handleFK(DataIntegrityViolationException ex, HttpServletRequest req) {
        ErrorResponseDto body = new ErrorResponseDto(      
            Instant.now(), 409, "Conflict",
            "Cannot delete: related records exist.", req.getRequestURI()
        );
        log.warn("Data integrity violation: {}", ex.getMessage());
        return new ResponseEntity<>(body, HttpStatus.CONFLICT);
    }


    /**
     * 杩欐槸涓€涓€滃畨鍏ㄧ綉鈥濓紝澶勭悊鎵€鏈夊叾浠栨湭琚崟鑾风殑寮傚父
     * 杩欏彲浠ラ槻姝㈡晱鎰熺殑鍫嗘爤淇℃伅娉勯湶缁欏鎴风銆?
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponseDto> handleGlobalException(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception at {}", request.getRequestURI(), ex);

        ErrorResponseDto errorResponse = new ErrorResponseDto(
                Instant.now(),
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "Internal Server Error",
            "An unexpected server error occurred. Please try again later.",
                request.getRequestURI()
        );
        return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
