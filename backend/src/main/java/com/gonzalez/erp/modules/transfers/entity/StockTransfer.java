package com.gonzalez.erp.modules.transfers.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.users.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "stock_transfers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockTransfer extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "origin_branch_id", nullable = false)
    private Branch originBranch;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "destination_branch_id", nullable = false)
    private Branch destinationBranch;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private StockTransferStatus status = StockTransferStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @OneToMany(mappedBy = "transfer", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<StockTransferItem> items = new ArrayList<>();

    public void confirm() {
        if (!isDraft()) {
            throw new InvalidStockTransferException(
                    "Only draft transfers can be confirmed");
        }

        this.status = StockTransferStatus.CONFIRMED;
        this.confirmedAt = LocalDateTime.now();
    }

    public void cancel() {
        if (!isDraft()) {
            throw new InvalidStockTransferException(
                    "Only draft transfers can be cancelled");
        }

        this.confirmedAt = null;
        this.status = StockTransferStatus.CANCELLED;
    }

    public void addItem(StockTransferItem item) {
        item.setTransfer(this);
        this.items.add(item);
    }

    public boolean isDraft() {
        return status == StockTransferStatus.DRAFT;
    }

    public boolean isConfirmed() {
        return status == StockTransferStatus.CONFIRMED;
    }

    public boolean isCancelled() {
        return status == StockTransferStatus.CANCELLED;
    }
}
