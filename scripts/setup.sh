#!/bin/sh

# Install helper utilities
yum install -y epel-release
yum install -y strace htop make

# Install Docker
yum install -y yum-utils

yum-config-manager \
  --add-repo \
  https://download.docker.com/linux/centos/docker-ce.repo

yum install -y docker-ce docker-ce-cli containerd.io

systemctl enable docker
systemctl start docker

# Install Deno Prereqs
yum install -y unzip

# Install Deno
export DENO_INSTALL="/opt/deno"
curl -fsSL https://deno.land/install.sh | sh

read -r -d '' DENO_EXPORTS << EOF
export DENO_INSTALL="/opt/deno"
export PATH="$DENO_INSTALL/bin:$PATH"
EOF

echo $DENO_EXPORTS >> /root/.bash_profile
echo $DENO_EXPORTS >> /home/vagrant/.bash_profile
