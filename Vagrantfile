# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
    config.vm.box = "almalinux/8"
    config.vm.box_version = "8.9.20231125"

    config.vm.provider :libvirt do |virt|
      virt.memory = 2048
      virt.cpus = 2
    end

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
