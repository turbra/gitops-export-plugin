FROM registry.access.redhat.com/ubi9/nodejs-22:latest AS build

ARG GITOPS_EXPORT_VERSION=0.0.0
ENV GITOPS_EXPORT_VERSION=${GITOPS_EXPORT_VERSION}

WORKDIR /opt/app-root/src
COPY --chown=1001:0 package*.json ./
USER 1001
RUN npm ci
COPY --chown=1001:0 . .
RUN npm run build

FROM registry.access.redhat.com/ubi9/nginx-120:latest

COPY --from=build /opt/app-root/src/dist /usr/share/nginx/html
USER 1001

ENTRYPOINT ["nginx", "-g", "daemon off;"]
