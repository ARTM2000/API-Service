import Axios from "axios";
import CustomToast from "./toastGenerator";

export const CONFIG = {
	baseUrl: {
		real: "<YOUR API BASE URL>",
		mock: "<YOUR MOCK API BASE URL>",
	},
	clientSecret: {
		headerName: "<HEADER NAME>",
		value: "<CLIENT SECRET VALUE>",
	},
	clientId: {
		headerName: "<HEADER NAME>",
		value: "<CLIENT ID VALUE>",
	},
	accessToken: {
		localStorageName: "<NAME OF LOCAL STORAGE ITEM WHICH YOU STORE USER ACCESS TOKEN>",
		headerName: "<ACCESS TOEKN HEADER NAME>",
		prefix: "Bearer ", /* Set your access token prefix here, in case you need it */
	},
	refreshToken: {
		active: true, /* If your API service support refresh token, make it true. Otherwise make it false */
		url: "", /* Set API route which your API used for refresh token functionality */
		method: "POST", /* Most of the time this function happen with 'POST' HTTP method. If it's not your case, change it to your need */
		token: {
			localStorageName: "<NAME OF LOCAL STORAGE ITEM WHICH YOU STORE USER REFRESH TOKEN>",
			headerName: "<HEADER NAME>",
			prefix: "", /* Set your access token prefix here, in case you need it */
		},
		onStatus: [401, 403], /* Set the HTTP status codes which refresh token function should fires. If it become empty array, refresh token not work */
	},
};

/**
 * For handling refresh token on certain statuses
 */
const refreshTokenHandler = () => {
	const myHeader = {
		[CONFIG.refreshToken.token.headerName]: 
            CONFIG.refreshToken.token.prefix + localStorage.getItem(
			CONFIG.refreshToken.token.localStorageName
		),
	};

	APIService(
		CONFIG.refreshToken.url,
		CONFIG.refreshToken.method,
		{
			onSuccess: (res, extraData) => {
				// save access token and refresh token later
			},
			onFail: (err, extraData) => {
				// some activities
			},
		},
		{
			headers: myHeader,
		},
		{
			deleteAccessTokenAfterRequest_fail: true,
			useClientSecret: true,
			disableRefreshToken: true,
		}
	);
};

/**
 * Full useable APIService (v2)
 * @param {String} url API call url. This will added to the base url
 * @param {String} method API call methods. Should be `GET`, `POST`, `PUT`, `DELETE` or `PATCH`
 * @param callback An object that should have `onSuccess` function and `onFail` function. For passing extra data to the functions, add `extraData` field. Functions receive this data as second props and `response` or `error` as first
 * @param requestData An object which use for passing `headers`, `body`, `params` to request. For add other axios options, put them in `options`
 * @param requestOptions An object for change APIService behavior.
 */
export const APIService = (
	url,
	method,
	callback = {
		onSuccess: () => {},
		onFail: () => {},
		extraData: null,
	},
	requestData = {
		headers: {},
		body: {},
		params: {},
		options: {},
	},
	requestOptions = {
		toast: {
			success: "",
			fail: "",
		},
		useClientSecret: false,
		disableClientId: false,
		useAccessToken: false,
		disableLogOnError: false,
		deleteAccessTokenAfterRequest_success: false,
		deleteAccessTokenAfterRequest_fail: false,
		useMockBaseURL: false,
		disableRefreshToken: false,
	}
) => {
	let api,
		headers = {},
		body = {},
		params = {},
		options = {},
		extraData = null;

	/* function properties validation */
	/* url validation */
	if (url === null || url === undefined) {
		throw "APIService ERROR: url is not defined correctly";
	}

	/* method validation */
	if (
		method !== "GET" &&
		method !== "POST" &&
		method !== "PUT" &&
		method !== "DELETE" &&
		method !== "PATCH"
	) {
		throw "APIService ERROR: API call method is not defined correctly";
	}

	/* callback properties validation */
	if (!callback) {
		throw "APIService ERROR: callback object not defined";
	}
	if (callback.onSuccess === undefined) {
		throw "APIService ERROR: 'onSuccess' callback not defined";
	}
	if (callback.onFail === undefined) {
		throw "APIService ERROR: 'onFail' callback not defined";
	}
	if (callback.extraData) {
		extraData = callback.extraData;
	}

	if (requestData) {
		if (requestData.headers) {
			headers = requestData.headers;
		}
		if (requestData.body) {
			body = requestData.body;
		}
		if (requestData.params) {
			params = requestData.params;
		}
		if (requestData.options) {
			options = requestData.options;
		}
	}

	/* modify request headers */
	if (requestOptions.useClientSecret) {
		headers[CONFIG.clientSecret.headerName] = CONFIG.clientSecret.value;
	}
	if (requestOptions.useAccessToken) {
		headers[CONFIG.accessToken.headerName] =
			CONFIG.accessToken.prefix +
			localStorage.getItem(CONFIG.accessToken.localStorageName);
	}

	/* if client id exist in CONFIG, we send it by request */
	if (CONFIG.clientId.value !== "" && !requestOptions.disableClientId) {
		headers[CONFIG.clientId.headerName] = CONFIG.clientId.value;
	}

	api = Axios.create({
		baseURL: requestOptions.useMockBaseURL
			? CONFIG.baseUrl.mock
			: CONFIG.baseUrl.real,
		headers: headers,
		params: params,
		data: method !== "GET" ? body : {},
		...options,
	});

	let response;

	switch (method) {
		case "GET":
			response = api.get(url);
			break;

		case "POST":
			response = api.post(url);
			break;

		case "PUT":
			response = api.put(url);
			break;

		case "DELETE":
			response = api.delete(url);
			break;

		case "PATCH":
			response = api.patch(url);
			break;

		default:
			return;
	}

	response
		.then((res) => {
			/* do the magic */
			callback.onSuccess(res, extraData);
			if (requestOptions.toast && requestOptions.toast.success !== "") {
				CustomToast(requestOptions.toast.success, "success");
			}
			// if (res.data && res.data.message) {
			//     CustomToast(res.data.message.msg, res.data.message.type);
			// }
			if (requestOptions.deleteAccessTokenAfterRequest_success) {
				localStorage.removeItem(CONFIG.accessToken.localStorageName);
			}
		})
		.catch((err) => {
			const errorResponse = err.response;
			let reportData = {
				_refresh_token_process: false,
			};

			if (CONFIG.refreshToken.active && !requestOptions.disableRefreshToken) {
				for (let i = 0; i < CONFIG.refreshToken.onStatus.length; i++) {
					const status = CONFIG.refreshToken.onStatus[i];
					if (errorResponse && errorResponse.status === status) {
						/* do refresh token functionality */
						reportData._refresh_token_process = true;
						refreshTokenHandler();
						/* then break the loop */
						break;
					}
				}
			}

			/* take a rest and then fix error :)) */
			callback.onFail(err, { ...extraData, ...reportData });
			if (requestOptions.toast && requestOptions.toast.fail !== "") {
				CustomToast(requestOptions.toast.fail, "error");
			}
			// if (errorResponse && errorResponse.data && errorResponse.data.message) {
			//     CustomToast(errorResponse.data.message.msg, errorResponse.data.message.type);
			// }
			if (requestOptions.deleteAccessTokenAfterRequest_fail) {
				localStorage.removeItem(CONFIG.accessToken.localStorageName);
			}
			if (!requestOptions.disableLogOnError) {
				console.error(err);
			}
		});
};

/**
 * Full useable async APIService (v2)
 * @param {String} url API call url. This will added to the base url
 * @param {String} method API call methods. Should be `GET`, `POST`, `PUT`, `DELETE` or `PATCH`
 * @param callback An object that should have `onSuccess` function and `onFail` function. For passing extra data to the functions, add `extraData` field. Functions receive this data as second props
 * @param requestData An object which use for passing `headers`, `body`, `params` to request. For add other axios options, put them in `options`
 * @param requestOptions An object for change APIService behavior.
 */
export const AsyncAPIService = async (
	url,
	method,
	callback = {
		onSuccess: () => {},
		onFail: () => {},
		extraData: null,
	},
	requestData = {
		headers: {},
		body: {},
		params: {},
		options: {},
	},
	requestOptions = {
		toast: {
			success: "",
			fail: "",
		},
		useClientSecret: false,
		disableClientId: false,
		useAccessToken: false,
		disableLogOnError: false,
		deleteAccessTokenAfterRequest_success: false,
		deleteAccessTokenAfterRequest_fail: false,
		useMockBaseURL: false,
		disableRefreshToken: false,
	}
) => {
	let api,
		headers = {},
		body = {},
		params = {},
		options = {},
		extraData = null;

	/* function properties validation */
	/* url validation */
	if (url === null || url === undefined) {
		throw "APIService ERROR: url is not defined correctly";
	}

	/* method validation */
	if (
		method !== "GET" &&
		method !== "POST" &&
		method !== "PUT" &&
		method !== "DELETE" &&
		method !== "PATCH"
	) {
		throw "APIService ERROR: API call method is not defined correctly";
	}

	/* callback properties validation */
	if (!callback) {
		throw "APIService ERROR: callback object not defined";
	}
	if (callback.onSuccess === undefined) {
		throw "APIService ERROR: 'onSuccess' callback not defined";
	}
	if (callback.onFail === undefined) {
		throw "APIService ERROR: 'onFail' callback not defined";
	}
	if (callback.extraData) {
		extraData = callback.extraData;
	}

	if (requestData) {
		if (requestData.headers) {
			headers = requestData.headers;
		}
		if (requestData.body) {
			body = requestData.body;
		}
		if (requestData.params) {
			params = requestData.params;
		}
		if (requestData.options) {
			options = requestData.options;
		}
	}

	/* modify request headers */
	if (requestOptions.useClientSecret) {
		headers[CONFIG.clientSecret.headerName] = CONFIG.clientSecret.value;
	}
	if (requestOptions.useAccessToken) {
		headers[CONFIG.accessToken.headerName] =
			CONFIG.accessToken.prefix +
			localStorage.getItem(CONFIG.accessToken.localStorageName);
	}

	/* if client id exist in CONFIG, we send it by request */
	if (CONFIG.clientId.value !== "" && !requestOptions.disableClientId) {
		headers[CONFIG.clientId.headerName] = CONFIG.clientId.value;
	}

	api = Axios.create({
		baseURL: requestOptions.useMockBaseURL
			? CONFIG.baseUrl.mock
			: CONFIG.baseUrl.real,
		headers: headers,
		params: params,
		data: method !== "GET" ? body : {},
		...options,
	});

	let response;

	try {
		switch (method) {
			case "GET":
				response = await api.get(url);
				break;

			case "POST":
				response = await api.post(url);
				break;

			case "PUT":
				response = await api.put(url);
				break;

			case "DELETE":
				response = await api.delete(url);
				break;

			case "PATCH":
				response = await api.patch(url);
				break;

			default:
				return;
		}

		/* do the magic */
		callback.onSuccess(response, extraData);
		if (requestOptions.toast && requestOptions.toast.success !== "") {
			CustomToast(requestOptions.toast.success, "success");
		}
		// if (res.data && res.data.message) {
		//     CustomToast(res.data.message.msg, res.data.message.type);
		// }
		if (requestOptions.deleteAccessTokenAfterRequest_success) {
			localStorage.removeItem(CONFIG.accessToken.localStorageName);
		}
	} catch (err) {
        /* take a rest and then fix error :)) */
		const errorResponse = err.response;
		let reportData = {
			_refresh_token_process: false,
		};

		if (CONFIG.refreshToken.active && !requestOptions.disableRefreshToken) {
			for (let i = 0; i < CONFIG.refreshToken.onStatus.length; i++) {
				const status = CONFIG.refreshToken.onStatus[i];
				if (errorResponse && errorResponse.status === status) {
					/* do refresh token functionality */
					reportData._refresh_token_process = true;
					refreshTokenHandler();
					/* then break the loop */
					break;
				}
			}
		}

		callback.onFail(err, { ...extraData, ...reportData });
		if (requestOptions.toast && requestOptions.toast.fail !== "") {
			CustomToast(requestOptions.toast.fail, "error");
		}
		// if (errorResponse && errorResponse.data && errorResponse.data.message) {
		//     CustomToast(errorResponse.data.message.msg, errorResponse.data.message.type);
		// }
		if (requestOptions.deleteAccessTokenAfterRequest_fail) {
			localStorage.removeItem(CONFIG.accessToken.localStorageName);
		}
		if (!requestOptions.disableLogOnError) {
			console.error(err);
		}
	}
};
