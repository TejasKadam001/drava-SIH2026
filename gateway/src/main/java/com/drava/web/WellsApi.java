package com.drava.web;

import com.drava.upstream.InferenceClient;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/gw/wells")
@Tag(name = "Wells & Digital Twin", description = "Endpoints for well states, telemetry, and dynamometer cards")
public class WellsApi {

    private final InferenceClient inference;

    public WellsApi(InferenceClient inference) {
        this.inference = inference;
    }

    @Operation(summary = "Get Cyber-Physical Digital Twin State")
    @GetMapping("/{wellId}/state")
    public Map<String, Object> state(@PathVariable("wellId") String wellId) {
        return inference.wellState(wellId);
    }

    @Operation(summary = "Get Real-Time Surface & Downhole Dynamometer Card")
    @GetMapping("/{wellId}/srp/dyno-card")
    public Map<String, Object> dynoCard(@PathVariable("wellId") String wellId) {
        return inference.dynoCard(wellId);
    }
}
