import {
	DockerComposeEnvironment,
	StartedDockerComposeEnvironment,
	Wait,
} from "testcontainers";
import path from "path";

let dockerEnvironment: StartedDockerComposeEnvironment;
before(async function () {
	const composePath = path.join(__dirname);
	const composeFile = "docker-compose-test.yaml";

	dockerEnvironment = await new DockerComposeEnvironment(
		composePath,
		composeFile
	)
		.withStartupTimeout(30_000)
		.withWaitStrategy("thor-solo", Wait.forHealthCheck())
		.up();

	console.log("Docker compose environment started");
});

after(function () {
	if (dockerEnvironment) {
		dockerEnvironment.down();
	}
});