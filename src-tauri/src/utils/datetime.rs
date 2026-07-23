use chrono::{DateTime, Local};
use std::time::{SystemTime, UNIX_EPOCH};

/// 获取当前时间戳（毫秒）
pub fn get_current_timestamp() -> u64 {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => duration.as_millis() as u64,
        Err(_) => 0,
    }
}

fn format_local(dt: DateTime<Local>) -> String {
    dt.format("%Y/%m/%d %H:%M:%S").to_string()
}

/// 格式化日期时间为人类可读格式
pub fn format_datetime(timestamp: u64) -> String {
    if let Some(dt) = DateTime::from_timestamp(timestamp as i64, 0) {
        format_local(dt.into())
    } else {
        "Invalid timestamp".to_string()
    }
}

/// 获取当前格式化的日期时间
pub fn get_current_formatted_datetime() -> String {
    format_local(Local::now())
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
