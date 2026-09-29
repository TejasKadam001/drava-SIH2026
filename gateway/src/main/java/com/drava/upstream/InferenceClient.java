package com.drava.upstream;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Function;
import java.util.function.Supplier;

/**
 * Thin proxy to the Python inference service. Every call degrades to a small,
 * clearly-labelled payload when the upstream is unreachable so the UI never breaks.
 */
@Component
public class InferenceClient {

    private final RestTemplate http;
    private final String baseUrl;

    public InferenceClient(RestTemplateBuilder builder,
                           @Value("${drava.ml-service.url:http://localhost:8000}") String baseUrl) {
        this.baseUrl = baseUrl;
        this.http = builder
                .setConnectTimeout(Duration.ofSeconds(4))
                .setReadTimeout(Duration.ofSeconds(6))
                .build();
    }

    public Map<String, Object> wellState(String wellId) {
        return guarded(
                () -> fetch("/v1/wells/" + wellId + "/state"),
                ex -> offlineState(wellId));
    }

    public Map<String, Object> dynoCard(String wellId) {
        return guarded(
                () -> fetch("/v1/wells/" + wellId + "/srp/dyno-card"),
                ex -> entry("well_id", wellId, "status", "FALLBACK_MODE"));
    }

    public Map<String, Object> optimise(Map<String, Object> body) {
        return guarded(
                () -> submit("/v1/plan/joint", body),
                ex -> entry("status", "FAILED_OR_FALLBACK",
                        "message", "ML service optimization endpoint unavailable: " + ex.getMessage()));
    }

    public Map<String, Object> ask(String question, String wellId) {
        Map<String, String> body = new LinkedHashMap<>();
        body.put("query", question);
        body.put("well_id", wellId);
        return guarded(
                () -> submit("/v1/assistant/ask", body),
                ex -> entry("answer", "Copilot agent temporarily in offline fallback mode. Error: " + ex.getMessage()));
    }

    // ---- internals -------------------------------------------------------------

    @SuppressWarnings("unchecked")
    private Map<String, Object> fetch(String path) {
        return http.getForObject(baseUrl + path, Map.class);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> submit(String path, Object body) {
        return http.postForObject(baseUrl + path, body, Map.class);
    }

    private static Map<String, Object> guarded(Supplier<Map<String, Object>> call,
                                               Function<Exception, Map<String, Object>> fallback) {
        try {
            return call.get();
        } catch (Exception ex) {
            return fallback.apply(ex);
        }
    }

    private static Map<String, Object> offlineState(String wellId) {
        return entry(
                "well_id", wellId,
                "data_source_mode", "FALLBACK_OFFLINE",
                "scientific_honesty_disclaimer", "SIMULATED / SYNTHETIC - NOT OIL INDIA FIELD DATA");
    }

    private static Map<String, Object> entry(Object... kv) {
        Map<String, Object> out = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) {
            out.put((String) kv[i], kv[i + 1]);
        }
        return out;
    }
}
