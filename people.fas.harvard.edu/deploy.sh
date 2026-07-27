#!/bin/sh
# Deploy the site to tiny, which serves /var/www/html as nginx's default host.
#
# One-time setup on tiny (the docroot ships root-owned):
#     sudo chown -R agold:agold /var/www/html
# nginx only reads the docroot, so this does not affect serving.
#
# The altsvr exclude is load-bearing: /var/www/html/altsvr is a second live
# site on port 8080, and --delete would otherwise erase it.

set -eu

cd "$(dirname "$0")"

rsync -avz --delete \
	--exclude '.git/' \
	--exclude 'altsvr/' \
	--exclude 'index.nginx-debian.html' \
	--exclude 'deploy.sh' \
	--exclude 'workspace.code-workspace' \
	./ tiny:/var/www/html/

echo
echo "Deployed. http://tiny/"
