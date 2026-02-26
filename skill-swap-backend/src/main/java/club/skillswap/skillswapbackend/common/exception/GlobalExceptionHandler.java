package club.skillswap.skillswapbackend.common.exception;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import club.skillswap.skillswapbackend.common.dto.ErrorResponseDto;

import java.time.Instant;

// @RestControllerAdvice 注解表明这是一个全局的异常处理组件
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * 处理我们自定义的 ResourceNotFoundException
     * 当 Service 层抛出这个异常时，这个方法会被调用。
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
     * 处理 Spring Security 的 AccessDeniedException
     * 当用户尝试访问他们没有权限的资源时（例如，普通用户访问管理员端点），这个方法会被调用。
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
     * 处理我们的通用业务逻辑异常 (DomainException)。
     * 当 Service 层抛出这个异常时，这个方法会被调用，并返回 400 Bad Request。
     */
    @ExceptionHandler(DomainException.class)
    public ResponseEntity<ErrorResponseDto> handleDomainException(DomainException ex, HttpServletRequest request) {
        ErrorResponseDto errorResponse = new ErrorResponseDto(
                Instant.now(),
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                ex.getMessage(), // 直接使用异常中定义的消息
                request.getRequestURI()
        );
        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }

    /**
     * 新增：处理由 @Valid 注解触发的验证失败异常。
     * 这会捕获所有 DTO 上的验证错误（如 @NotBlank, @Size 等）。
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponseDto> handleValidationExceptions(MethodArgumentNotValidException ex, HttpServletRequest request) {
        
        // 从异常中提取第一个错误信息作为我们的 message
        String errorMessage = ex.getBindingResult().getAllErrors().get(0).getDefaultMessage();

        System.err.println("An unexpected error occurred: ");
        ex.printStackTrace();

        ErrorResponseDto errorResponse = new ErrorResponseDto(
                Instant.now(),
                HttpStatus.BAD_REQUEST.value(),
                "Validation Failed",
                errorMessage, // 使用具体的验证错误信息
                request.getRequestURI()
        );
        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }

    /**
     * 处理 Spring 的 ResponseStatusException。
     * 这个异常通常在我们需要动态设置 HTTP 状态码时使用，例如 401 Unauthorized 或 403 Forbidden。
     */
    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    public ResponseEntity<ErrorResponseDto> handleRSE(ResponseStatusException ex,
                                                    HttpServletRequest req) {
        HttpStatusCode status = ex.getStatusCode();

        // 兼容获取“错误名”（FORBIDDEN/UNAUTHORIZED...）
        String error =
            (status instanceof HttpStatus hs) ? hs.getReasonPhrase() : status.toString();

        ErrorResponseDto body = new ErrorResponseDto(
            Instant.now(),
            status.value(),  // 数字码
            error,           // 错误名
            ex.getReason(),  // 你抛异常时写的 reason
            req.getRequestURI()
        );

        return ResponseEntity.status(status).body(body);
    }

    /**
     * 处理数据库完整性违规异常 (DataIntegrityViolationException)。
     * 例如，当尝试删除一个有外键依赖的记录时，这个异常会被抛出。
     * 我们将其映射为 409 Conflict 状态码。
     */
    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponseDto> handleFK(DataIntegrityViolationException ex, HttpServletRequest req) {
        ErrorResponseDto body = new ErrorResponseDto(      
            Instant.now(), 409, "Conflict",
            "Cannot delete: related records exist.", req.getRequestURI()
        );
        ex.printStackTrace();
        return new ResponseEntity<>(body, HttpStatus.CONFLICT);
    }


    /**
     * 这是一个“安全网”，处理所有其他未被捕获的异常
     * 这可以防止敏感的堆栈信息泄露给客户端。
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponseDto> handleGlobalException(Exception ex, HttpServletRequest request) {
        // 打印详细的错误日志
        ex.printStackTrace();

        ErrorResponseDto errorResponse = new ErrorResponseDto(
                Instant.now(),
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "Internal Server Error",
                "An unexpected error occurred: " + ex.getMessage(),
                request.getRequestURI()
        );
        return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}