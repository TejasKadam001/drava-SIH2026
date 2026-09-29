package com.drava.messaging;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/** Live-stream plumbing: a SockJS-backed STOMP endpoint plus a raw WebSocket twin. */
@Configuration
@EnableWebSocketMessageBroker
public class StompBrokerSetup implements WebSocketMessageBrokerConfigurer {

    private static final String BROADCAST_PREFIX = "/topic";
    private static final String INBOUND_PREFIX = "/app";

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.setApplicationDestinationPrefixes(INBOUND_PREFIX);
        registry.enableSimpleBroker(BROADCAST_PREFIX);
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws-native").setAllowedOriginPatterns("*");
        registry.addEndpoint("/ws-stomp").setAllowedOriginPatterns("*").withSockJS();
    }
}
