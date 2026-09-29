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
@RequestMapping("/gw/plan")
@Tag(name = "Optimization & Scenario Engine", description = "Joint CSS + SRP Pareto Optimization")
public class OptimizerApi {

    private final InferenceClient inference;

    public OptimizerApi(InferenceClient inference) {
        this.inference = inference;
    }

    @Operation(summary = "Run Constrained Multi-Objective Pareto Optimization")
    @PostMapping("/run")
    public Map<String, Object> run(@RequestBody Map<String, Object> body) {
        return inference.optimise(body);
    }
}
