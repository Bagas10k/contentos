import sys
import json
import instaloader
from datetime import datetime

def get_instagram_data(username):
    # Initialize Instaloader instance
    L = instaloader.Instaloader()
    
    try:
        # Fetch profile metadata
        profile = instaloader.Profile.from_username(L.context, username)
        
        # 1. Check if the profile is private
        if profile.is_private:
            return {
                "success": False,
                "error": "private_account",
                "message": f"Akun @{username} bersifat privat. Tidak dapat mengakses data postingan."
            }
        
        # 2. Structure basic profile info
        data = {
            "success": True,
            "username": profile.username,
            "fullName": profile.full_name,
            "bio": profile.biography,
            "profilePicUrl": profile.profile_pic_url,
            "followersCount": profile.followers,
            "followingCount": profile.followees,
            "postsCount": profile.mediacount,
            "isVerified": profile.is_verified,
            "posts": []
        }
        
        total_likes = 0
        total_comments = 0
        posts_analyzed = 0
        
        # 3. Retrieve last 10 posts to compute engagement metrics
        for post in profile.get_posts():
            if posts_analyzed >= 10:
                break
            
            post_info = {
                "shortcode": post.shortcode,
                "likes": post.likes,
                "comments": post.comments,
                "caption": post.caption,
                "date": post.date_utc.isoformat(),
                "is_video": post.is_video,
                "video_views": post.video_view_count if post.is_video else 0,
                "url": f"https://www.instagram.com/p/{post.shortcode}/"
            }
            data["posts"].append(post_info)
            
            total_likes += post.likes
            total_comments += post.comments
            posts_analyzed += 1
            
        # 4. Calculate Engagement Rate (ER)
        # Formula: ((Average Likes + Average Comments) / Total Followers) * 100
        if profile.followers > 0 and posts_analyzed > 0:
            avg_likes = total_likes / posts_analyzed
            avg_comments = total_comments / posts_analyzed
            engagement_rate = ((avg_likes + avg_comments) / profile.followers) * 100
            
            data["engagementRate"] = round(engagement_rate, 2)
            data["averageLikes"] = round(avg_likes, 1)
            data["averageComments"] = round(avg_comments, 1)
        else:
            data["engagementRate"] = 0.0
            data["averageLikes"] = 0.0
            data["averageComments"] = 0.0
            
        return data

    except instaloader.exceptions.ProfileNotExistsException:
        return {
            "success": False,
            "error": "profile_not_found",
            "message": f"Username @{username} tidak ditemukan."
        }
    except instaloader.exceptions.ConnectionException as e:
        return {
            "success": False,
            "error": "connection_error",
            "message": f"Gagal terhubung ke Instagram (Rate Limit/IP Blocked): {str(e)}"
        }
    except Exception as e:
        return {
            "success": False,
            "error": "unknown_error",
            "message": f"Terjadi kesalahan internal pada script Python: {str(e)}"
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "missing_argument",
            "message": "Username Instagram harus dikirimkan sebagai argumen."
        }))
        sys.exit(1)
        
    target_username = sys.argv[1]
    result_data = get_instagram_data(target_username)
    
    # Return JSON string output to standard output (stdout)
    print(json.dumps(result_data, indent=2))
