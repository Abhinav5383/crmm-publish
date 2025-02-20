## A simple script to publish your project versions to [CRMM](https://www.crmm.tech)

This is a JS script so you will need a JS runtime installed on your pc like [Node.js](https://nodejs.org/en/download/package-manager) or [Bun](https://bun.sh/).

```sh
$ node publish.js
```

Note: All the file paths you have specified in the script config will be relative to the directory you run the script in, so I'd suggest to define paths relative to your project's root and then run the script there.

## Configuration

You can either define the config object directly inside the script like this: \
(You can also use environment variables if you are defining the config in the script, use `proecess.env.VARIABLE` to access them)
```diff
- const CONFIG_FILE = "publish.config.json";
+ const CONFIG_FILE = {
+     title: "Example title",
+     version: "1.7.3",
+     ...
+ }
```
or, set the `CONFIG_FILE` variable to a json file path and define the config object in that file

`publish.config.json`
```json
{
	"title": "Example version",
	"version": "1.8.0",
	"featured": false,
	"releaseChannel": "release",
	"loaders": ["quilt"],
	"gameVersions": {
		"file": "src/main/resources/quilt.mod.json",
		"key": "quilt_loader.depends.1.versions"
	},
	"files": {
		"primary": "dist/mod-1.8.0.jar",
		"additional": ["dist/mod-sources-1.8.0.jar"]
	},

	"repoApi": "https://api.github.com/repos/USER_NAME/REPO",
	"gitReleaseUrl": "/releases/latest",
	"crmm": {
		"authToken": "g5myuyngq3vsgu23afuuzorbecuebndhkbwckoy",
		"projectId": "iris"
	}
}
```

- **title**: The title of the version (Optional, uses the `version` by default)

- **loaders**: List of supported loaders (Required, [See available loaders here](https://api.crmm.tech/api/tags/loaders))

- **releaseChannel**: `release | beta | alpha | *dev (Required)` \
    *Old `dev` versions are automatically deleted when new ones are published (the current limit is 3).

- **gameVersions**: A list of supported game versions or an object containing path to a json and key to the game versions field in that json \
    Example: 
    ```json
    "gameVersions": [">=0.3.1", "0.2.5"],
    ```
    OR
    ```json
    "gameVersions": {
        "file": "src/main/resources/quilt.mod.json",
        "key": "quilt_loader.depends.1.versions"
    }
    ```
    `src/main/resources/quilt.mod.json`
    ```json
    "versions": ">=0.3.1"
    ```
    NOTE:- You can use numbers for array indices

- **files**:
    - **primary**: The primary file for the version (Required)
    - **additional**: List of additional files (Optional, Max 10 files)

- **crmm**:
    - **authToken**: Your crmm authToken (Required, [How to get the AuthToken](https://docs.crmm.tech/#how-to-get-the-authtoken))
    - **projectId**: The ID/Slug of the project you want to upload the version for


### Using Environment variables

The script provides a function `getProps` that can be used to load key value pairs from any .env like file \
This can be used to structure the config with dynamic environment dependent values

For example:
```ts
const props = await getProps("./gradle.properties");

const CONFIG = {
	title: `Mod ${props.version}`,
	version: props.version,
	files: {
		primary: `mod-${props.version}.jar`,
	},
    // Rest of the config...
};
```
