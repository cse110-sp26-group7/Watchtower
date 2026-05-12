export default function deploy() {
  process.loadEnvFile("../.env");
  console.log(`Deploying watchtower app: ${process.env.PROJECT_ID}`);
}
