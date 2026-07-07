"""initial schema

Revision ID: 20260707_0001
Revises:
Create Date: 2026-07-07 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260707_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sys_config",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("config_key", sa.String(length=50), nullable=False, unique=True),
        sa.Column("config_value", sa.Text(), nullable=False),
        sa.Column("description", sa.String(length=200)),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        "sys_role",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("role_name", sa.String(length=50), nullable=False, unique=True),
        sa.Column("role_code", sa.String(length=50), nullable=False, unique=True),
        sa.Column("permissions", sa.JSON()),
        sa.Column("description", sa.String(length=200)),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        "sys_user",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("username", sa.String(length=50), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("real_name", sa.String(length=50), nullable=False),
        sa.Column("phone", sa.String(length=20)),
        sa.Column("department", sa.String(length=100)),
        sa.Column("status", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_sys_user_username", "sys_user", ["username"], unique=False)
    op.create_table(
        "sys_user_role",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["role_id"], ["sys_role.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["sys_user.id"]),
        sa.UniqueConstraint("user_id", "role_id", name="uq_user_role_pair"),
    )
    op.create_table(
        "patient",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("gender", sa.Integer()),
        sa.Column("age", sa.Integer()),
        sa.Column("phone", sa.String(length=20)),
        sa.Column("diagnosis_type", sa.String(length=20)),
        sa.Column("severity", sa.String(length=10)),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="enrolled"),
        sa.Column("responsible_doctor_id", sa.Integer()),
        sa.Column("server_chan_key", sa.String(length=64)),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["responsible_doctor_id"], ["sys_user.id"]),
    )
    op.create_index("ix_patient_name", "patient", ["name"], unique=False)
    op.create_index("ix_patient_phone", "patient", ["phone"], unique=False)
    op.create_index("ix_patient_responsible_doctor_id", "patient", ["responsible_doctor_id"], unique=False)
    op.create_index("ix_patient_status", "patient", ["status"], unique=False)
    op.create_table(
        "patient_self_report",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("patient_id", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(length=30), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("doctor_reply", sa.Text()),
        sa.Column("replied_at", sa.DateTime()),
        sa.Column("replied_by", sa.Integer()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["patient_id"], ["patient.id"]),
        sa.ForeignKeyConstraint(["replied_by"], ["sys_user.id"]),
    )
    op.create_index("ix_patient_self_report_created_at", "patient_self_report", ["created_at"], unique=False)
    op.create_index("ix_patient_self_report_patient_id", "patient_self_report", ["patient_id"], unique=False)
    op.create_table(
        "patient_tag",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=50), nullable=False, unique=True),
        sa.Column("color", sa.String(length=7)),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        "patient_tag_rel",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("patient_id", sa.Integer(), nullable=False),
        sa.Column("tag_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["patient_id"], ["patient.id"]),
        sa.ForeignKeyConstraint(["tag_id"], ["patient_tag.id"]),
        sa.UniqueConstraint("patient_id", "tag_id", name="uq_patient_tag_pair"),
    )
    op.create_table(
        "followup_template",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("applicable_type", sa.String(length=50)),
        sa.Column("total_days", sa.Integer()),
        sa.Column("creator_id", sa.Integer()),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["creator_id"], ["sys_user.id"]),
    )
    op.create_table(
        "followup_stage",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("template_id", sa.Integer(), nullable=False),
        sa.Column("stage_order", sa.Integer(), nullable=False),
        sa.Column("stage_name", sa.String(length=50), nullable=False),
        sa.Column("start_day_offset", sa.Integer(), nullable=False),
        sa.Column("duration_days", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["template_id"], ["followup_template.id"]),
    )
    op.create_table(
        "stage_task",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("stage_id", sa.Integer(), nullable=False),
        sa.Column("task_type", sa.String(length=30), nullable=False),
        sa.Column("executor", sa.String(length=20), nullable=False),
        sa.Column("frequency", sa.String(length=50)),
        sa.Column("remind_before_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("description", sa.String(length=200)),
        sa.ForeignKeyConstraint(["stage_id"], ["followup_stage.id"]),
    )
    op.create_table(
        "followup_plan",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("template_id", sa.Integer()),
        sa.Column("patient_id", sa.Integer(), nullable=False),
        sa.Column("creator_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date()),
        sa.Column("current_stage", sa.Integer()),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["creator_id"], ["sys_user.id"]),
        sa.ForeignKeyConstraint(["patient_id"], ["patient.id"]),
        sa.ForeignKeyConstraint(["template_id"], ["followup_template.id"]),
    )
    op.create_index("ix_followup_plan_creator_id", "followup_plan", ["creator_id"], unique=False)
    op.create_index("ix_followup_plan_patient_id", "followup_plan", ["patient_id"], unique=False)
    op.create_index("ix_followup_plan_status", "followup_plan", ["status"], unique=False)
    op.create_table(
        "blood_glucose_record",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("patient_id", sa.Integer(), nullable=False),
        sa.Column("value", sa.Numeric(5, 2), nullable=False),
        sa.Column("measure_time", sa.DateTime(), nullable=False),
        sa.Column("category", sa.String(length=20), nullable=False),
        sa.Column("is_abnormal", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("abnormal_reason", sa.String(length=100)),
        sa.Column("source", sa.String(length=10), nullable=False, server_default="patient"),
        sa.Column("notes", sa.String(length=500)),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["patient_id"], ["patient.id"]),
    )
    op.create_index("ix_blood_glucose_record_category", "blood_glucose_record", ["category"], unique=False)
    op.create_index("ix_blood_glucose_record_measure_time", "blood_glucose_record", ["measure_time"], unique=False)
    op.create_index("ix_blood_glucose_record_patient_id", "blood_glucose_record", ["patient_id"], unique=False)
    op.create_table(
        "diet_record",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("patient_id", sa.Integer(), nullable=False),
        sa.Column("meal_type", sa.String(length=10), nullable=False),
        sa.Column("food_items", sa.Text(), nullable=False),
        sa.Column("record_time", sa.DateTime(), nullable=False),
        sa.Column("notes", sa.String(length=500)),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["patient_id"], ["patient.id"]),
    )
    op.create_index("ix_diet_record_patient_id", "diet_record", ["patient_id"], unique=False)
    op.create_index("ix_diet_record_record_time", "diet_record", ["record_time"], unique=False)
    op.create_table(
        "diet_recommendation",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("patient_id", sa.Integer(), nullable=False),
        sa.Column("generate_method", sa.String(length=10), nullable=False),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("review_status", sa.String(length=10), nullable=False, server_default="pending"),
        sa.Column("reviewer_id", sa.Integer()),
        sa.Column("review_comment", sa.String(length=500)),
        sa.Column("push_status", sa.String(length=10), nullable=False, server_default="unpushed"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("reviewed_at", sa.DateTime()),
        sa.ForeignKeyConstraint(["patient_id"], ["patient.id"]),
        sa.ForeignKeyConstraint(["reviewer_id"], ["sys_user.id"]),
    )
    op.create_index("ix_diet_recommendation_patient_id", "diet_recommendation", ["patient_id"], unique=False)
    op.create_index("ix_diet_recommendation_review_status", "diet_recommendation", ["review_status"], unique=False)
    op.create_table(
        "notification_template",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("trigger_event", sa.String(length=50), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("channel", sa.String(length=20), nullable=False, server_default="server_chan"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        "notification_log",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("recipient_type", sa.String(length=10), nullable=False),
        sa.Column("recipient_id", sa.Integer(), nullable=False),
        sa.Column("plan_id", sa.Integer()),
        sa.Column("template_id", sa.Integer()),
        sa.Column("channel", sa.String(length=20), nullable=False),
        sa.Column("content_sent", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=10), nullable=False, server_default="pending"),
        sa.Column("fail_reason", sa.String(length=200)),
        sa.Column("sent_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["plan_id"], ["followup_plan.id"]),
        sa.ForeignKeyConstraint(["template_id"], ["notification_template.id"]),
    )
    op.create_index("ix_notification_log_plan_id", "notification_log", ["plan_id"], unique=False)
    op.create_index("ix_notification_log_recipient_id", "notification_log", ["recipient_id"], unique=False)
    op.create_index("ix_notification_log_status", "notification_log", ["status"], unique=False)
    op.create_table(
        "sys_operation_log",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("action_type", sa.String(length=30), nullable=False),
        sa.Column("action_desc", sa.String(length=500), nullable=False),
        sa.Column("target_type", sa.String(length=50)),
        sa.Column("target_id", sa.Integer()),
        sa.Column("ip_address", sa.String(length=45)),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["sys_user.id"]),
    )
    op.create_index("ix_sys_operation_log_created_at", "sys_operation_log", ["created_at"], unique=False)
    op.create_index("ix_sys_operation_log_target_type", "sys_operation_log", ["target_type"], unique=False)
    op.create_index("ix_sys_operation_log_user_id", "sys_operation_log", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_sys_operation_log_user_id", table_name="sys_operation_log")
    op.drop_index("ix_sys_operation_log_target_type", table_name="sys_operation_log")
    op.drop_index("ix_sys_operation_log_created_at", table_name="sys_operation_log")
    op.drop_table("sys_operation_log")
    op.drop_index("ix_notification_log_status", table_name="notification_log")
    op.drop_index("ix_notification_log_recipient_id", table_name="notification_log")
    op.drop_index("ix_notification_log_plan_id", table_name="notification_log")
    op.drop_table("notification_log")
    op.drop_table("notification_template")
    op.drop_index("ix_diet_recommendation_review_status", table_name="diet_recommendation")
    op.drop_index("ix_diet_recommendation_patient_id", table_name="diet_recommendation")
    op.drop_table("diet_recommendation")
    op.drop_index("ix_diet_record_record_time", table_name="diet_record")
    op.drop_index("ix_diet_record_patient_id", table_name="diet_record")
    op.drop_table("diet_record")
    op.drop_index("ix_blood_glucose_record_patient_id", table_name="blood_glucose_record")
    op.drop_index("ix_blood_glucose_record_measure_time", table_name="blood_glucose_record")
    op.drop_index("ix_blood_glucose_record_category", table_name="blood_glucose_record")
    op.drop_table("blood_glucose_record")
    op.drop_index("ix_followup_plan_status", table_name="followup_plan")
    op.drop_index("ix_followup_plan_patient_id", table_name="followup_plan")
    op.drop_index("ix_followup_plan_creator_id", table_name="followup_plan")
    op.drop_table("followup_plan")
    op.drop_table("stage_task")
    op.drop_table("followup_stage")
    op.drop_table("followup_template")
    op.drop_table("patient_tag_rel")
    op.drop_table("patient_tag")
    op.drop_index("ix_patient_self_report_patient_id", table_name="patient_self_report")
    op.drop_index("ix_patient_self_report_created_at", table_name="patient_self_report")
    op.drop_table("patient_self_report")
    op.drop_index("ix_patient_status", table_name="patient")
    op.drop_index("ix_patient_responsible_doctor_id", table_name="patient")
    op.drop_index("ix_patient_phone", table_name="patient")
    op.drop_index("ix_patient_name", table_name="patient")
    op.drop_table("patient")
    op.drop_table("sys_user_role")
    op.drop_index("ix_sys_user_username", table_name="sys_user")
    op.drop_table("sys_user")
    op.drop_table("sys_role")
    op.drop_table("sys_config")
