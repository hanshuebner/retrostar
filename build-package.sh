#!/bin/bash

DIR=client-package

package_name=$(awk '/^Package:/ { print $2 }' ${DIR}/DEBIAN/control)
package_version=$(awk '/^Version:/ { print $2 }' ${DIR}/DEBIAN/control)
dpkg-deb --build ${DIR} "${package_name}-${package_version}.deb"

