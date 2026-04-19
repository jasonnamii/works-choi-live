# works-choi

Private deployment hub for `works.choi.build`.
Owner: Jason (최남희 / jasoncnh@gmail.com)

## Structure
```
/index.html   Landing (noindex)
/CNAME        works.choi.build
/robots.txt   Disallow all
/404.html     Fallback
/{project}/   Sub-projects
```

## Add a project
```bash
cd /tmp/gh-deploy/works-choi
mkdir my-project && cp /path/to/index.html my-project/
git add my-project && git commit -m "add my-project" && git push
# → https://works.choi.build/my-project/
```
