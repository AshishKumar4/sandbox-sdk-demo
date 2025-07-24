FROM docker.io/ghostwriternr/cloudflare-sandbox:0.1.0

EXPOSE 3000
EXPOSE 8080
EXPOSE 3001
EXPOSE 3002
EXPOSE 3003

# Run the same command as the original image
CMD ["bun", "index.ts"]