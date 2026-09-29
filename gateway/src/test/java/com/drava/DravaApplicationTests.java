package com.drava;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("local")
class DravaApplicationTests {

    @Test
    void applicationContextStartsAndMigrationsApply() {
        // Boots the full Spring context; Flyway migrations run against the embedded database.
    }
}
