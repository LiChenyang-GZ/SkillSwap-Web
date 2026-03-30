package club.skillswap.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

// @ResponseStatus 娉ㄨВ浼氳 Spring 鍦ㄦ姏鍑烘寮傚父鏃讹紝鑷姩璁剧疆 HTTP 鍝嶅簲鐘舵€佺爜涓?404 Not Found
@ResponseStatus(HttpStatus.NOT_FOUND)
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(String resourceName, String fieldName, Object fieldValue) {
        super(String.format("%s not found with %s : '%s'", resourceName, fieldName, fieldValue));
    }
}
