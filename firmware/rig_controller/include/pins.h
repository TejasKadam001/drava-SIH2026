#pragma once

// --- Load cell (HX711) : measures rod load through the stroke ---
#define PIN_HX711_DOUT   16
#define PIN_HX711_SCK    17

// --- Rotary encoder on the crank : rod position / crank angle ---
#define PIN_ENCODER_A    18
#define PIN_ENCODER_B    19

// --- Fluid reservoir temperature (DS18B20, 1-Wire) : CSS heating/cooling stand-in ---
#define PIN_TEMP_ONEWIRE 4

// --- Heater band control (SSR, PWM) : simulates steam injection heating the fluid ---
#define PIN_HEATER_SSR   25

// --- DC motor driver (H-bridge PWM) : stands in for the real VFD, drives stroke speed ---
#define PIN_MOTOR_PWM    26
#define PIN_MOTOR_DIR    27

// --- Status LEDs ---
#define PIN_LED_FAULT    2
#define PIN_LED_RUN      15
