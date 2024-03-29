#!/bin/bash

dir=client-package

name=$(awk '/^Package:/ { print $2 }' ${dir}/DEBIAN/control)
version=$(awk '/^Version:/ { print $2 }' ${dir}/DEBIAN/control)
package="retrostar-client-1.0.deb"
dpkg-deb --build ${dir} "$package"
dpkg-deb -c "$package"
mv "$package" webserver/public/retrostar-client.deb
