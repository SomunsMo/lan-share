extern crate proc_macro;

use proc_macro::TokenStream;
use quote::quote;
use syn::{
    parse_macro_input, FnArg, Ident, ItemFn, Pat, ReturnType, Type, TypePath, PathArguments, 
    GenericArgument, Path, PathSegment
};

// 检查类型是否为特定类型
fn is_type_matching(ty: &Type, module_segments: &[&str], target_name: &str) -> bool {
    match ty {
        Type::Path(TypePath { path, .. }) => {
            if let Some(last_segment) = path.segments.last() {
                if last_segment.ident == target_name {
                    // 如果有模块路径，检查是否匹配
                    if module_segments.is_empty() {
                        return true;
                    }
                    // 检查完整路径是否匹配
                    if path.segments.len() >= module_segments.len() {
                        for (i, expected_segment) in module_segments.iter().enumerate() {
                            if path.segments[i].ident != expected_segment {
                                return false;
                            }
                        }
                        return true;
                    }
                }
            }
        }
        _ => {}
    }
    false
}

// 检查是否是QueryParams类型
fn is_query_params_type(ty: &Type) -> bool {
    is_type_matching(ty, &[], "QueryParams")
}

// 检查是否是BodyData类型
fn is_body_data_type(ty: &Type) -> bool {
    is_type_matching(ty, &[], "BodyData")
}



// 通用的属性宏处理函数
fn http_method_macro(attr: TokenStream, item: TokenStream, method: Option<&str>) -> TokenStream {
    // 解析路径属性
    let path = attr.to_string();
    let input = parse_macro_input!(item as ItemFn);

    let fn_name = &input.sig.ident;
    let inputs = &input.sig.inputs;
    let output = &input.sig.output;

    // 检查函数是否为 async
    if input.sig.asyncness.is_none() {
        let method_name = method.unwrap_or("request");
        return syn::Error::new_spanned(
            &input,
            format!(
                "The handler function annotated with #[{}] must be declared as async.",
                method_name
            ),
        )
        .to_compile_error()
        .into();
    }

    // 生成参数注入代码
    let (param_decls, param_calls): (Vec<_>, Vec<_>) = inputs
        .iter()
        .enumerate()
        .map(|(i, arg)| {
            if let FnArg::Typed(pt) = arg {
                let pat = &pt.pat;
                let ty = &pt.ty;
                
                // 生成参数名称
                let param_name = Ident::new(&format!("__param{}", i), fn_name.span());
                
                // 根据参数类型生成不同的注入代码
                let param_decl = if is_query_params_type(ty) {
                    // 如果是 QueryParams 类型
                    quote! {
                        let #param_name = crate::QueryParams::from_request(&req).await;
                    }
                } else if is_body_data_type(ty) {
                    // BodyData不能自动注入，因为body只能消费一次
                    quote! {
                        compile_error!("BodyData cannot be automatically injected because request body can only be consumed once. Use manual parsing with crate::extract_json_body().");
                    }
                } else {
                    // 对于 Request<Incoming> 类型
                    if is_type_matching(ty, &[], "Request") {
                        // 我们不再限制Request必须是第一个参数
                        // 如果是Request参数，我们不需要做任何特殊处理，因为它已经在函数签名中
                        quote! {}
                    } else {
                        quote! {
                            compile_error!("Only QueryParams or Request<Incoming> are supported.");
                        }
                    }
                };
                
                // 对于 Request 参数，我们直接使用 req 变量；对于其他参数，使用生成的变量
                let param_call = if is_type_matching(ty, &[], "Request") {
                    quote! { req }
                } else {
                    quote! { #param_name }
                };
                
                (param_decl, param_call)
            } else {
                panic!("Only typed arguments are supported");
            }
        })
        .unzip();

    // 提取输出类型，确保它与宏生成的错误处理一致
    let output_type = match output {
        ReturnType::Type(_, ty) => quote! { #ty },
        ReturnType::Default => quote! { () },
    };
    
    // 检查输出类型是否为Result，并包含std::convert::Infallible作为错误类型
    // 这是为了确保错误处理与函数签名匹配

    let path_str = path.trim_matches('"');

    // 生成方法标识符
    let method_expr = match method {
        Some(m) => {
            // 将方法名转换为标识符
            let method_ident = Ident::new(m, fn_name.span());
            quote! { Some(::hyper::Method::#method_ident) }
        }
        None => quote! { None },
    };

    // 生成唯一的函数名（并转小写）
    let method_suffix = method.unwrap_or("request").to_lowercase();
    let register_fn_name = Ident::new(
        &format!("__register_{}_{}", method_suffix, fn_name),
        fn_name.span(),
    );
    let wrapper_fn_name = Ident::new(&format!("__{}_wrapper", fn_name), fn_name.span());

    // 生成展开后的代码
    let expanded = quote! {
        #input

        #[allow(non_snake_case)]
        fn #wrapper_fn_name(mut req: ::hyper::Request<::hyper::body::Incoming>) -> 
            std::pin::Pin<Box<dyn std::future::Future<Output = #output_type> + Send>>
        {
            Box::pin(async move {
                #(#param_decls)*
                #fn_name(#(#param_calls),*).await
            })
        }

        #[::ctor::ctor]
        fn #register_fn_name() {
            let handler = crate::http_server::handler::BaseHandler {
                path: #path_str,
                method: #method_expr,
                handler_func: #wrapper_fn_name,
            };
            crate::http_server::handler::register_handler(handler);
        }
    };

    TokenStream::from(expanded)
}

#[proc_macro_attribute]
pub fn request(attr: TokenStream, item: TokenStream) -> TokenStream {
    http_method_macro(attr, item, None)
}

#[proc_macro_attribute]
pub fn get(attr: TokenStream, item: TokenStream) -> TokenStream {
    http_method_macro(attr, item, Some("GET"))
}

#[proc_macro_attribute]
pub fn post(attr: TokenStream, item: TokenStream) -> TokenStream {
    http_method_macro(attr, item, Some("POST"))
}

#[proc_macro_attribute]
pub fn put(attr: TokenStream, item: TokenStream) -> TokenStream {
    http_method_macro(attr, item, Some("PUT"))
}

#[proc_macro_attribute]
pub fn delete(attr: TokenStream, item: TokenStream) -> TokenStream {
    http_method_macro(attr, item, Some("DELETE"))
}
