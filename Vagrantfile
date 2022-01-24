# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
    config.vm.box = "nickvd/rockylinux8"
    config.vm.box_version = "8.5.20220121"

    config.ssh.username = 'root'
    config.ssh.password = 'vagrant'

    config.vm.provision "setup", type: "shell" do |s|
      s.path = "scripts/setup.sh"
      s.reboot = false
      s.privileged = true
    end

    config.vm.provision "download_image", type: "shell" do |s|
      s.path = "scripts/download_image.sh"
      s.reboot = false
      s.privileged = true
    end
end
