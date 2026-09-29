package com.drava.web;

import com.drava.upstream.InferenceClient;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/gw/assistant")
@Tag(name = "Agentic AI Copilot", description = "Deterministic tool supervisor and reasoning assistant")
public class AssistantApi {

    private static final String DEFAULT_QUESTION = "Summarize well state";
    private static final String DEFAULT_WELL = "BW-DEMO-001";

    private final InferenceClient inference;

    public AssistantApi(InferenceClient inference) {
        this.inference = inference;
    }

    @Operation(summary = "Submit an engineering query to the Agentic Supervisor")
    @PostMapping("/query")
    public Map<String, Object> query(@RequestBody Map<String, String> body) {
        String question = body.getOrDefault("query", DEFAULT_QUESTION);
        String wellId = body.getOrDefault("well_id", DEFAULT_WELL);
        return inference.ask(question, wellId);
    }
}
