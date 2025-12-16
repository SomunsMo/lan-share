extern crate proc_macro;

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, FnArg, Ident, ItemFn, Pat, ReturnType};

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

    // 提取参数名称
    let arg_names: Vec<_> = inputs
        .iter()
        .filter_map(|arg| {
            if let FnArg::Typed(pt) = arg {
                if let Pat::Ident(pat_ident) = &*pt.pat {
                    Some(quote! { #pat_ident })
                } else {
                    Some(quote! { #pt.pat })
                }
            } else {
                None
            }
        })
        .collect();

    // 提取输出类型
    let output_type = match output {
        ReturnType::Type(_, ty) => quote! { #ty },
        ReturnType::Default => quote! { () },
    };

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
        fn #wrapper_fn_name(#inputs) ->
            std::pin::Pin<Box<dyn std::future::Future<Output = #output_type> + Send>>
        {
            Box::pin(#fn_name(#(#arg_names),*))
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
