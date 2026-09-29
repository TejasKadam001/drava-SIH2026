#pragma once

// Minimal PID controller used for two loops on the rig:
//   1) Heater band -> fluid temperature (simulates steam heating / cooling between CSS cycles)
//   2) Motor PWM  -> stroke speed / SPM (stands in for the real VFD closed loop)
class PID {
public:
    PID(float kp, float ki, float kd, float outMin, float outMax)
        : _kp(kp), _ki(ki), _kd(kd), _outMin(outMin), _outMax(outMax) {}

    void setSetpoint(float sp) { _setpoint = sp; }

    float update(float measured, float dtSeconds) {
        float error = _setpoint - measured;
        _integral += error * dtSeconds;
        // basic anti-windup: clamp the integral term to the output range
        _integral = constrain(_integral, _outMin / max(_ki, 0.0001f), _outMax / max(_ki, 0.0001f));
        float derivative = (dtSeconds > 0.0f) ? (error - _prevError) / dtSeconds : 0.0f;
        _prevError = error;

        float output = _kp * error + _ki * _integral + _kd * derivative;
        return constrain(output, _outMin, _outMax);
    }

    void reset() { _integral = 0.0f; _prevError = 0.0f; }

private:
    float _kp, _ki, _kd;
    float _outMin, _outMax;
    float _setpoint = 0.0f;
    float _integral = 0.0f;
    float _prevError = 0.0f;
};
