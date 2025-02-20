import { readFile } from "node:fs/promises";

// Load key value pairs from any .env like file
// const props = await getProps("gradle.properties");

// Either a path to a JSON file or an object
// const CONFIG = "publish.config.json";
const CONFIG = {
	title: "Mod 0.1.5",
	version: "0.1.5",
	featured: true,
	releaseChannel: "beta",
	loaders: ["quilt"],
	gameVersions: [">=0.3.1", "0.2.4"],
	files: {
		primary: "mod-1.5.0.jar",
		// additional: ["mod-sources-1.5.0.jar"]
	},

	repoApi: "https://api.github.com/repos/USER_NAME/REPO",
	gitReleaseUrl: "/releases/latest",
	crmm: {
		authToken: "YOUR_AUTH_TOKEN",
		projectId: "PROJECT_ID"
	}
};

const CRMM_API_URL = "https://api.crmm.tech/api";
const includeGameVersionTypes = [
	"release",
	"beta",
	"alpha",
	// "pre-release",
	// "snapshot"
];

async function main() {
	const configData = await loadConfigData();
	console.log({ ...configData, authToken: "_REDACTED_" });

	console.log("Preparing form data...");
	const formData = await prepareMultipartFormData(configData);

	console.log("Uploading version...");
	const response = await fetch(
		`${CRMM_API_URL}/project/${configData.projectId}/version`,
		{
			method: "POST",
			body: formData,
			headers: {
				Cookie: `auth-token=${configData.authToken}`,
				Origin: "https://crmm.tech",
				Referer: "https://crmm.tech/",
			},
		},
	);

	const data = await response.json();
	console.log(data);
}

await main();

async function prepareMultipartFormData(data) {
	const formData = new FormData();
	formData.append("title", data.title);
	formData.append("changelog", data.changelog || "");
	formData.append("featured", `${data.featured === true}`);
	formData.append("releaseChannel", data.releaseChannel);
	formData.append("versionNumber", data.version);
	formData.append("loaders", JSON.stringify(data.loaders || []));
	formData.append("gameVersions", JSON.stringify(data.gameVersions));
	formData.append("dependencies", JSON.stringify(data.dependencies || []));
	formData.append("primaryFile", data.primaryFile);
	for (const additionalFile of data.additionalFiles || []) {
		formData.append("additionalFiles", additionalFile);
	}

	return formData;
}

async function loadConfigData() {
	console.log("Loading config...");
	const config = await getConfig();

	// Version
	const version = config.version;
	if (!version) {
		throw new Error("Version is required");
	}
	const title = config.title || version;

	const featured = config.featured === true;
	const releaseChannel = config.releaseChannel || "release";
	const loaders = config.loaders || [];
	const gameVersions = await getGameVersions(config.gameVersions);
	if (!gameVersions) {
		throw new Error("Game versions are required");
	}

	// Changelog
	const repoUrl = config.repoApi;
	const releasePath = config.gitReleaseUrl;

	const releaseUrl = releasePath.startsWith("http")
		? releasePath
		: `${repoUrl}${releasePath}`;
	const changelog = await getVersionChangelog(releaseUrl);

	// Files
	const primaryFilePath = config.files?.primary;
	if (!primaryFilePath) {
		throw new Error("Primary file path is required");
	}

	const primaryFile = await getFile(primaryFilePath);
	const additionalFiles = await getFiles(config.files?.additional || []);

	// Crmm API data
	const authToken = config?.crmm?.authToken;
	if (!authToken) throw new Error("Auth token is required");

	const projectId = config?.crmm?.projectId;
	if (!projectId) throw new Error("Project ID is required");

	return {
		title,
		version,
		featured,
		releaseChannel,
		loaders,
		gameVersions,
		changelog,
		primaryFile,
		additionalFiles,
		authToken,
		projectId,
	};
}

async function getGameVersions(source) {
	// The API returns sorted versions list in descending order
	const res = await fetch(`${CRMM_API_URL}/tags/game-versions`);
	const availableVersions = await res.json();

	if (!availableVersions || !Array.isArray(availableVersions))
		throw new Error("Failed to fetch game versions");

	const filteredAvailableVersions = availableVersions
		.filter((version) => includeGameVersionTypes.includes(version.releaseType))
		.map((version) => version.value);

	let gameVersions_raw = [];

	if (Array.isArray(source)) {
		gameVersions_raw = source;
	} else if (typeof source === "string") {
		gameVersions_raw = [source];
	} else {
		const gameVersionSourceKey = source.key;
		if (!gameVersionSourceKey)
			throw new Error("Missing field 'key' in 'gameVersions'");
		const keys = gameVersionSourceKey.split(".");

		const gameVersionSourceFile = await getFileContents(source.file, "utf-8");
		const gameVersionSourceJson = JSON.parse(gameVersionSourceFile);

		gameVersions_raw = getObjValue(gameVersionSourceJson, keys);
		if (!gameVersions_raw)
			throw new Error(
				`Failed to get game versions from source file using key '${gameVersionSourceKey}'`,
			);

		if (typeof gameVersions_raw === "string")
			gameVersions_raw = [gameVersions_raw];
	}

	const parsedGameVersions = new Set();
	for (const version of gameVersions_raw) {
		const parsedList = parseVersion(version, filteredAvailableVersions);
		if (!parsedList) continue;

		for (const v of parsedList) {
			parsedGameVersions.add(v);
		}
	}

	const gameVersionsList = sortVersions(
		Array.from(parsedGameVersions),
		filteredAvailableVersions,
	);
	if (gameVersionsList.length === 0) throw new Error("No valid game versions");

	return gameVersionsList;
}

async function getVersionChangelog(url) {
	console.log("Fetching changelog...");
	let fetchUrl = url;
	if (url.includes("/tag/")) {
		fetchUrl = url.replace("/tag/", "/tags/");
	}

	const res = await fetch(fetchUrl);
	const data = await res.json();

	return data?.body || "";
}

async function getConfig() {
	if (typeof CONFIG !== "string") {
		return CONFIG;
	}

	const file = await getFileContents(CONFIG, "utf-8");
	const json = JSON.parse(file);

	return json;
}

async function getFiles(paths) {
	const files = await Promise.all(paths.map((path) => getFile(path)));
	return files;
}

async function getFile(path) {
	const fileContents = await getFileContents(path);
	const fileName = path.split("/").pop();

	return new File([fileContents], fileName);
}

async function getFileContents(path, encoding) {
	const fileContents = await readFile(path, { encoding: encoding });
	return fileContents;
}

function parseVersion(version, refList) {
	let versionStr = version;
	if (versionStr.startsWith("v")) versionStr = versionStr.slice(1);

	// If the version string doesn't include any operators, return it as is
	if (
		!versionStr.includes("=") &&
		!versionStr.includes("<") &&
		!versionStr.includes(">")
	) {
		return [versionStr];
	}

	// Throw error if the version string doesn't start with a valid operator but includes one
	if (
		!versionStr.startsWith("=") &&
		!versionStr.startsWith(">=") &&
		!versionStr.startsWith("<=") &&
		!versionStr.startsWith(">") &&
		!versionStr.startsWith("<")
	) {
		throw new Error(`Cannot parse version string: '${versionStr}'`);
	}

	const parsedVersions = [];
	if (versionStr.startsWith("<")) {
		versionStr = versionStr.slice(1);
		if (versionStr.startsWith("=")) {
			versionStr = versionStr.slice(1);
			parsedVersions.push(versionStr);
		}

		const refIndex = refList.indexOf(versionStr);
		if (refIndex === -1) return null;

		parsedVersions.push(...refList.slice(refIndex + 1));
	}

	if (versionStr.startsWith(">")) {
		versionStr = versionStr.slice(1);
		if (versionStr.startsWith("=")) {
			versionStr = versionStr.slice(1);
			parsedVersions.push(versionStr);
		}

		const refIndex = refList.indexOf(versionStr);
		if (refIndex === -1) return null;

		parsedVersions.push(...refList.slice(0, refIndex));
	}

	if (versionStr.startsWith("=")) {
		versionStr = versionStr.slice(1);
		parsedVersions.push(versionStr);
	}

	return parsedVersions;
}

function sortVersions(list, refList) {
	const sorted = [];
	for (const version of refList) {
		if (list.includes(version)) sorted.push(version);
	}

	return sorted;
}

function getObjValue(obj, keys) {
	let curr = obj;
	for (const key of keys) {
		curr = curr[key];
	}

	return curr;
}

async function getProps(filePath) {
	const file = await getFileContents(filePath, "utf-8");
	if (!file) return undefined;

	// Parse the .env file
	const props = {};

	const lines = file.split("\n");
	for (const line of lines) {
		if (line.startsWith("#") || !line.includes("=")) continue;

		let [key, value] = line.split("=");
		if (!key?.length || !value?.length) continue;

		if (value.startsWith('"') && value.endsWith('"') ||
			value.startsWith("'") && value.endsWith("'")
		) {
			value = value.slice(1, -1);
		}

		props[key.trim()] = value.trim();
	}

	return props;
}