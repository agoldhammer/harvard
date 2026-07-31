#!/bin/sh
# Deploy the site to one of two hosts:
#
#     ./deploy.sh          # tiny (the default)
#     ./deploy.sh con1
#
# One-time setup on either host (the docroot ships root-owned):
#     sudo chown -R agold:agold <docroot>
# nginx only reads the docroot, so this does not affect serving.

set -eu

cd "$(dirname "$0")"

target=${1:-tiny}

# Excludes both targets need.
#
# docs/content.html is the homepage in plain HTML; what ships is the encoded
# docs/content.enc built from it by tools/encode-content.py. Shipping the
# plaintext would hand a crawler exactly what the gate withholds, so this
# exclude is load-bearing -- as is the one for tools/, which holds the
# encoder and has no business on a web server.
set -- --exclude '.git/' \
	--exclude 'deploy.sh' \
	--exclude 'workspace.code-workspace' \
	--exclude 'tools/' \
	--exclude 'docs/content.html'

case "$target" in
tiny)
	# tiny serves /var/www/html as nginx's default host.
	dest=tiny:/var/www/html/
	done_msg="Deployed. http://tiny/"
	# The altsvr exclude is load-bearing: /var/www/html/altsvr is a second
	# live site on port 8080, and --delete would otherwise erase it. The
	# Debian placeholder page is likewise not ours to delete.
	set -- "$@" \
		--exclude 'altsvr/' \
		--exclude 'index.nginx-debian.html'
	;;
con1)
	# /var/www/artsite is ours alone, so it needs no extra excludes.
	dest=con1:/var/www/artsite/
	done_msg="Deployed. https://art.ghmr.net/"
	;;
*)
	echo "usage: $0 [tiny|con1]" >&2
	exit 2
	;;
esac

rsync -avz --delete "$@" ./ "$dest"

echo
echo "$done_msg"
