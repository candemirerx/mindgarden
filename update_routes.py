import os

def update_page(path):
    t = open(path, encoding='utf-8').read()
    t = t.replace("import { useParams", "import { useSearchParams")
    t = t.replace("useParams,", "useSearchParams,")
    t = t.replace("useParams()", "useSearchParams()")
    t = t.replace("params.id as string", "searchParams.get('id') || ''")
    t = t.replace("params.nodeId as string", "searchParams.get('nodeId') || ''")
    t = t.replace("const params = ", "const searchParams = ")
    
    # route replaces
    t = t.replace("`/bahce/${gardenId}/projeler`", "`/projeler?id=${gardenId}`")
    t = t.replace("`/bahce/${gardenId}/editor/${node.id}`", "`/editor?id=${gardenId}&nodeId=${node.id}`")
    t = t.replace("`/bahce/${gardenId}/editor/${nodeId}`", "`/editor?id=${gardenId}&nodeId=${nodeId}`")
    t = t.replace("`/bahce/${gardenId}`", "`/bahce_view?id=${gardenId}`")
    
    open(path, 'w', encoding='utf-8').write(t)

update_page('app/bahce_view/page.tsx')
update_page('app/projeler/page.tsx')
update_page('app/editor/page.tsx')
update_page('app/page.tsx')
