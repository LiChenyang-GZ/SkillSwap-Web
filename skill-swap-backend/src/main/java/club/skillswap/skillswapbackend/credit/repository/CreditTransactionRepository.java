package club.skillswap.skillswapbackend.credit.repository;

import club.skillswap.skillswapbackend.credit.entity.CreditTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CreditTransactionRepository extends JpaRepository<CreditTransaction, Long> {
    
    // 根据用户ID查询其所有交易记录
    List<CreditTransaction> findByUserId(UUID userId);
    
    // 根据用户ID和工作坊ID查询交易
    List<CreditTransaction> findByUserIdAndWorkshopId(UUID userId, Long workshopId);
}
