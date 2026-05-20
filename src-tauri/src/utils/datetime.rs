use chrono::{DateTime, Local, NaiveDateTime, TimeZone};
use std::time::{SystemTime, UNIX_EPOCH};

/// 获取当前时间戳（毫秒）
pub fn get_current_timestamp() -> u64 {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => duration.as_millis() as u64,
        Err(_) => 0, // 如果系统时间早于Unix纪元，则返回0
    }
}

/// 格式化日期时间为人类可读格式
///
/// # Arguments
/// * `timestamp` - Unix时间戳（秒）
///
/// # Returns
/// * `String` - 格式化后的日期时间字符串，格式为 "YYYY/MM/DD HH:mm:ss"
pub fn format_datetime(timestamp: u64) -> String {
    // 检查时间戳是否在i64范围内，避免2038问题
    if timestamp <= i64::MAX as u64 {
        // 使用推荐的DateTime::from_timestamp处理正常范围的时间戳
        match DateTime::from_timestamp(timestamp as i64, 0) {
            Some(dt) => {
                // 转换为本地时间并格式化
                let local_time = Local.from_local_datetime(&dt.naive_local()).single();
                match local_time {
                    Some(local_dt) => local_dt.format("%Y/%m/%d %H:%M:%S").to_string(),
                    None => {
                        // 如果本地时间转换失败，仍然返回UTC时间格式
                        dt.format("%Y/%m/%d %H:%M:%S").to_string()
                    }
                }
            }
            None => "Invalid timestamp".to_string(),
        }
    } else {
        // 对于超出i64范围的时间戳，使用NaiveDateTime::from_timestamp_opt
        // 尽管被标记为弃用，但这是处理大时间戳的唯一方法
        #[allow(deprecated)]
        match NaiveDateTime::from_timestamp_opt(timestamp as i64, 0) {
            Some(ndt) => {
                // 转换为本地时间并格式化
                let local_time = Local.from_local_datetime(&ndt).single();
                match local_time {
                    Some(local_dt) => local_dt.format("%Y/%m/%d %H:%M:%S").to_string(),
                    None => {
                        // 如果本地时间转换失败，仍然返回NaiveDateTime格式
                        ndt.format("%Y/%m/%d %H:%M:%S").to_string()
                    }
                }
            }
            None => "Invalid timestamp".to_string(),
        }
    }
}

/// 获取当前格式化的日期时间
///
/// # Returns
/// * `String` - 当前格式化的日期时间字符串，格式为 "YYYY/MM/DD HH:mm:ss"
pub fn get_current_formatted_datetime() -> String {
    let now = Local::now();
    now.format("%Y/%m/%d %H:%M:%S").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_current_timestamp() {
        let timestamp = get_current_timestamp();
        assert!(timestamp > 0);
    }

    #[test]
    fn test_format_datetime() {
        // 测试一个已知的时间戳
        let formatted = format_datetime(1609459200); // 2021/01/01 00:00:00 UTC
        println!("Formatted datetime: {}", formatted);
        assert!(formatted.contains("2021"));

        // 测试2038年之后的时间戳（验证2038年问题修复）
        let future_timestamp = 2147483648; // 2038年之后的时间戳
        let future_formatted = format_datetime(future_timestamp);
        println!("Future formatted datetime: {}", future_formatted);
        assert!(!future_formatted.contains("Invalid timestamp"));
        assert!(future_formatted.contains('/'));
        assert!(future_formatted.contains(':'));
    }

    #[test]
    fn test_get_current_formatted_datetime() {
        let current = get_current_formatted_datetime();
        assert!(!current.is_empty());
        assert!(current.contains('/'));
        assert!(current.contains(':'));
    }
}
