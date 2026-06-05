package com.chist.notificationmodule.repository;

import com.chist.notificationmodule.model.DeliveryLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DeliveryLogRepository extends JpaRepository<DeliveryLog, UUID> {

    List<DeliveryLog> findByNotificationIdOrderByAttemptedAtDesc(UUID notificationId);
}
