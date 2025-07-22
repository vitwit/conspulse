# scripts/iavlviewer/Dockerfile
FROM golang:1.21

# Set the working directory
WORKDIR /app

# Copy the source code
COPY . .

# Build the Go binary
RUN go build -o iavlviewer .

# Expose the port
EXPOSE 8080

# Run the iavlviewer server
CMD ["./iavlviewer", "--server", "--port=8080"]
