#!/bin/sh
LIB_ROOT="/var/lib/runjs"
IMAGE_NAME="ubuntu"

if [ ! -z "$1" ]; then
  IMAGE_NAME="$1"
fi

mkdir -p "$LIB_ROOT/images/$IMAGE_NAME"

pushd "$LIB_ROOT/images"

docker export $(docker create $IMAGE_NAME) | tar -C $IMAGE_NAME -xvf -

popd
