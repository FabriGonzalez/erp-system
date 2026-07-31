package com.gonzalez.erp.modules.users.entity;

import com.gonzalez.erp.modules.branches.entity.Branch;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_branches")
@Getter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserBranch {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;
}
