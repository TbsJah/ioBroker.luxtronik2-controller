// This file extends the AdapterConfig type from "@iobroker/types"

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
	namespace ioBroker {
		interface AdapterConfig {
			host: string;
			port: number;
			interval: number;
			fusspunkt?: number;
			endpunkt?: number;
			zip_aktiv?: number;
			zip_aktiv_ww?: number;
			sync_warmwater_target_temperature?: number;
			sync_hotwater_temperature_hysteresis?: number;
			sync_heating_system_circ_pump_voltage_minimal_heating?: number;
			sync_heating_system_circ_pump_voltage_nominal_heating?: number;
			sync_heating_system_circ_pump_voltage_minimal_water?: number;
			sync_heating_system_circ_pump_voltage_nominal_water?: number;
			sync_return_temperature_hysteresis?: number;
			regelung_aktiv?: boolean;
			Heating_after_warmwater?: boolean;
			motionSensors?: Array<{ name: string; oid: string }>;
			motion_sensors_aktiv?: boolean;
			telegram_warnings?: boolean;
			telegram_enabled?: boolean;
			notification_bell?: boolean;
			telegram_receiver?: string;
			telegram_instance?: string;
			telegram_instance_id?: string;
			telegram_receiver_id?: string;
			telegram_receiver_name?: string;
			telegram_receiver_type?: string;
			telegram_receiver_isGroup?: boolean;
		}
	}
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};
