package com.chist.notificationmodule.repository;

import com.chist.notificationmodule.model.DeliveryLog;
import com.chist.notificationmodule.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findByRecipientUserIdOrderByCreatedAtDesc(UUID recipientUserId);

    long countByRecipientUserIdAndReadFalse(UUID recipientUserId);
}
