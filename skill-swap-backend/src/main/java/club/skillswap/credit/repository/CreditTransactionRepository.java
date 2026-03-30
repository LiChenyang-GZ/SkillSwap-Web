package club.skillswap.credit.repository;

import club.skillswap.credit.entity.CreditTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CreditTransactionRepository extends JpaRepository<CreditTransaction, Long> {
    
    // 鏍规嵁鐢ㄦ埛ID鏌ヨ鍏舵墍鏈変氦鏄撹褰?
    List<CreditTransaction> findByUserId(UUID userId);
    
    // 鏍规嵁鐢ㄦ埛ID鍜屽伐浣滃潑ID鏌ヨ浜ゆ槗
    List<CreditTransaction> findByUserIdAndWorkshopId(UUID userId, Long workshopId);
}

