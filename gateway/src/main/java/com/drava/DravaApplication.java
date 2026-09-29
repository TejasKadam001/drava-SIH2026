package com.drava;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Entry point of the Drava edge-facing API layer. */
@SpringBootApplication
@EnableScheduling
public class DravaApplication {

    public static void main(String[] args) {
        SpringApplication.run(DravaApplication.class, args);
    }
}
