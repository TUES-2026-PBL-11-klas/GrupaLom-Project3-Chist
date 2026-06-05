package com.chist.userservice.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;


@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<String>handleUserNotFound(UserNotFoundException ex){
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Invalid Credentials.");
    }

    @ExceptionHandler(EmailAlreadyExistException.class)
    public ResponseEntity<String>handleEmailExists(EmailAlreadyExistException ex){
        return ResponseEntity.status(HttpStatus.CONFLICT).body("User already exists.");
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<String>handleRuntime(RuntimeException ex){
        log.error("Unhandled runtime exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ex.getMessage());
    }
}
