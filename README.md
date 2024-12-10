# Podman Desktop Quadlet Extension

## Overview

![quadlet-list.png](images/quadlet-list.png)

## Generating Quadlets

This extension will allow you to list, generate, enable and delete podman quadlet in a given Podman Machine.

This extension integrate the [Podlet](https://github.com/containers/podlet) tool, allowing you to generate Quadlet file from 
an existing resource such as a Container or an Image.

### Containers

You can generate Quadlet from the Podman Desktop containers page, as visible bellow

![generate-from-containers-list.png](images/generate-from-containers-list.png)

![quadlet-generate-container.png](images/quadlet-generate-container.png)

Once generated, the podlet output can be edited before being loaded into the Podman Machine

![edit-podlet-output.png](images/edit-podlet-output.png)

### Compose

Podlet has a support for create quadlet from an existing compose specification

> Podman Desktop group containers in the same compose project. 
> This allows us to determine which spec has been used by looking at the `com.docker.compose.project.config_files` containers label

![generate-from-compose.png](images/generate-from-compose.png)

Two type of Quadlet can be generated from a compose specification, `Container`, `Kube` or `Pod`

![quadlet-generate-compose.png](images/quadlet-generate-compose.png)

