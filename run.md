# How to Run Drava (MACH 2)

This project has two parts: the software stack (which can run in simulation mode on its own) and the physical rig (which provides live hardware data).

## 1. Running the Software Stack (Simulation Mode)

If you don't have the physical rig connected, the software stack will automatically fall back to the physics simulator.

### ML Service (Backend)

1. Open a terminal and navigate to the root directory of the project.
2. Create and activate a virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
3. Install the required Python dependencies:
   ```bash
   pip install -r ml_service/requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   uvicorn ml_service.main:app --host 127.0.0.1 --port 8000 --reload
   ```

### Frontend (React Dashboard)

1. Open a second terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install the Node.js dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to the URL provided (usually `http://localhost:5173`).

*(Optional) Running tests:*
```bash
# From the root directory with the virtual environment activated
python scripts/test_all.py
```

## 2. Running with the Physical Rig (Live Hardware Mode)

To use live hardware data, you need to flash the ESP32 and run the MQTT bridge.

### Flash the ESP32

1. Navigate to the firmware directory:
   ```bash
   cd firmware/rig_controller
   ```
2. Flash the microcontroller using PlatformIO:
   ```bash
   pio run -t upload
   ```

### Start the Edge Gateway

1. Open a new terminal and navigate to the `edge_gateway` directory:
   ```bash
   cd edge_gateway
   ```
2. Make sure your Python virtual environment is activated, then install requirements:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the MQTT to API bridge:
   ```bash
   python mqtt_to_api_bridge.py
   ```

### Verify Connection

Once the bridge is running, you can confirm the rig is live by pinging the backend API:
```bash
curl http://127.0.0.1:8000/api/wells/BW-DEMO-001/data-mode
```
You should receive a response indicating `"mode": "LIVE_HARDWARE"`. The frontend dashboard will also automatically switch to live rig points.
