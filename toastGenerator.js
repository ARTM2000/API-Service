import { toast } from "react-toastify";

/**
 * Generating toast in app
 * @param {String} msg message which should show in toast
 * @param {String} mode success - warning - error - null
 */
const toastGenerator = (msg, mode) => {
	switch (mode) {
		case "success":
			return toast.success(msg, { style: { margin: "auto 10px auto auto" } });

		case "warning":
			return toast.warning(msg, { style: { margin: "auto 10px auto auto" } });

		case "error":
			return toast.error(msg, { style: { margin: "auto 10px auto auto" } });

		default:
			return toast.info(msg, { style: { margin: "auto 10px auto auto" } });
	}
};

export default toastGenerator;
