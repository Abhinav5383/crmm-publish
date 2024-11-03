## A simple script to publish your project versions to [CRMM](https://www.crmm.tech)

This is a JS script so you will need a JS runtime installed on your pc like [Node.js](https://nodejs.org/en/download/package-manager) or [Bun](https://bun.sh/).

`Config`
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

- **releaseChannel**: `release | beta | alpha (Required)`

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
    - **authToken**: Your crmm authToken (Required, See below how to get that)
    - **projectId**: The ID/Slug of the project you want to upload the version for


### How to get the authToken

*Please note that as of now there's no implementation of PATs, so we will be using your user session token for authentication.*

- Visit the [api.crmm.tech](https://api.crmm.tech/api) website and open dev tools (press `ctrl` `shift` `i`), also make sure you are logged in else you'd need to [login](https://www.crmm.tech/login) first.
- Go to the `network` tab
- Refresh the page (`f5`)
- Click on the first request made to the server
- Scroll down in `headers` section and find "Cookie:"
- Copy the `auth-token=YOUR_AUTH_TOKEN` part of the cookie.
- There you have it, remove the `auth-token=` part and paste the rest in the config
