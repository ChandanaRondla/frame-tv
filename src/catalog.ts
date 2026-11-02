export type Title={id:string;tmdbId:number;kind:'movie'|'tv';name:string;year:number;genre:string;description:string;poster:string|null;backdrop:string|null;rating:number};
export type CatalogRow={id:number;label:string;items:Title[]};
export const artwork=(path:string|null,size='w780')=>path?`https://image.tmdb.org/t/p/${size}${path}`:undefined;
async function request<T>(query:string,variables:Record<string,unknown>={},signal?:AbortSignal):Promise<T>{const r=await fetch('/graphql',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,variables}),signal});if(!r.ok)throw new Error(`GraphQL HTTP ${r.status}`);const result=await r.json();if(result.errors?.length)throw new Error(result.errors[0].message);return result.data as T}
const fields='id tmdbId kind name year genre description poster backdrop rating';
export async function getCatalog(signal?:AbortSignal){const d=await request<{catalog:{rows:CatalogRow[];uniqueTitles:number;source:string}}>(`query { catalog { uniqueTitles source rows { id label items { ${fields} } } } }`,{},signal);return d.catalog}
export async function searchTitles(query:string,signal?:AbortSignal){const d=await request<{search:Title[]}>(`query ($query:String!) { search(query:$query) { ${fields} } }`,{query},signal);return d.search}
export async function getTrailer(kind:string,id:number,signal?:AbortSignal){const d=await request<{trailer:{key:string;name:string}|null}>(`query ($kind:String!,$id:Int!) { trailer(kind:$kind,id:$id) { key name } }`,{kind,id},signal);return d.trailer}
