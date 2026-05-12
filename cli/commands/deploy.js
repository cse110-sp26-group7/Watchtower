export default function deploy() {
  process.loadEnvFile();
  console.log(`Deploying watchtower app: ${process.env.PROJECT_ID}`);
}
