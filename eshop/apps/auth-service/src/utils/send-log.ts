export const sendLog = (log: {
  type: "success" | "error" | "info";
  message: string;
  source: string;
}) => {
  console.log(`[${log.source}] ${log.type}: ${log.message}`);
};