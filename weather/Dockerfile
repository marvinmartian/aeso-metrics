# Use the official Go image as the base image
FROM golang:alpine AS build-stage

# Set the working directory inside the container
WORKDIR /app

# Copy the Go application files to the container
COPY weather/ .

# Build the Go application
RUN go build -o main .

# Final stage (minimal image with only the Go binary and certificates)
FROM golang:alpine

WORKDIR /app

# Copy only the built binary from the build stage
COPY --from=build-stage /app/main .


# Expose the port that the application will run on
EXPOSE 8181

# Command to run the executable
CMD ["./main"]
