package club.skillswap.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * 閫氱敤鐨勪笟鍔￠€昏緫寮傚父銆?
 * 褰撹繖涓紓甯歌鎶涘嚭鏃讹紝閫氬父鎰忓懗鐫€涓€涓繚鍙嶄簡涓氬姟瑙勫垯鐨勬棤鏁堟搷浣滐紝
 * 渚嬪锛屽皾璇曟坊鍔犱竴涓┖鐨勬妧鑳斤紝鎴栬€呮妧鑳芥暟閲忚秴杩囦笂闄愩€?
 * 鎴戜滑鎶婂畠鏄犲皠鍒?HTTP 400 Bad Request 鐘舵€佺爜銆?
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class DomainException extends RuntimeException {

    public DomainException(String message) {
        super(message);
    }

    public DomainException(String message, Throwable cause) {
        super(message, cause);
    }
}
