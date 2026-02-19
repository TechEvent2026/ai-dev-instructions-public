FROM mcr.microsoft.com/devcontainers/typescript-node:24-bookworm

# Install additional tools
RUN npm install -g @anthropic-ai/claude-code pnpm

# Create .claude directory with correct permissions
RUN mkdir -p /home/node/.claude && chown -R node:node /home/node/.claude && chmod -R 755 /home/node/.claude

# Set `DEVCONTAINER` environment variable to help with orientation
ENV DEVCONTAINER=true
