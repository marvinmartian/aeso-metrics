# Use the official Go image as the base image
FROM golang:alpine AS build-stage

# Install necessary packages (OpenSSL and ca-certificates)
RUN apk --no-cache add openssl ca-certificates

# Fetch the server certificate and store it
RUN echo "Fetching server certificate..." \
    && openssl s_client -showcerts -connect www.aeso.ca:443 </dev/null 2>/dev/null | \
    awk '/-----BEGIN CERTIFICATE-----/,/-----END CERTIFICATE-----/{print}' > /usr/local/share/ca-certificates/server.crt \
    && update-ca-certificates

# Set the working directory inside the container
WORKDIR /app

# Copy the Go application files to the container
COPY poolprice/ .

# Build the Go application
RUN go build -o main .

# Final stage (minimal image with only the Go binary and certificates)
FROM golang:alpine

WORKDIR /app

# Copy only the built binary from the build stage
COPY --from=build-stage /app/main .

# Copy the certificates from the build stage to the final stage
COPY --from=build-stage /etc/ssl/certs /etc/ssl/certs
COPY --from=build-stage /usr/local/share/ca-certificates /usr/local/share/ca-certificates

# Ensure all certificates are up to date in the final stage
RUN update-ca-certificates

# Expose the port that the application will run on
EXPOSE 8080

# Command to run the executable
CMD ["./main"]
